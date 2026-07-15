<template>
  <div class="playground">
    <BasicWysiwyg
      class="fs-100"
      style="height: 20rem; width: 40rem"
      :body="mybody"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      emitterValue: null,
      mybody:
        '<table class="my-custom-heading" style="minWidth: 574px"><colgroup><col style="width: 517px"><col style="width: 32px"><col></colgroup><tbody><tr><th colspan="1" rowspan="1" colwidth="517"><p><br>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus id feugiat nisl. Ut rutrum diam tellus, vitae consequat dolor rhoncus vel. Suspendisse ipsum purus, venenatis et pretium vitae, maximus eu metus. Integer dolor nunc, ultrices et elit quis, tristique tempus odio. Pellentesque varius maximus lobortis. Suspendisse potenti. Vestibulum ante ipsugue.</p></th><th colspan="1" rowspan="1" colwidth="32"><p>header</p></th><th colspan="1" rowspan="1"><p>header</p></th></tr><tr><td colspan="1" rowspan="1" colwidth="517"><p><br>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus id feugiat nisl. Ut rutrum diam tellus, vitae consequat dolor rhoncus vel. Suspendisse ipsum purus, venenatis et pretium vitae, maximus eu metus. Integer dolor nunc, ultrices et elit quis, tristique tempus odio. Pellentesque varius maximus lobortis. Suspendisse potenti. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam efficitur eu est non semper.</p><p style="text-align: justify">Nunc egestas fermentum erat sed euismod. Pellentesque volutpat cursus ipsum, nec aliquet sapien aliquam consequat. Vivamus auctor turpis ut felis molestie, quis molestie dui tincidunt. Nunc fringilla, justo et scelerisque imperdiet, sem massa ultrices massa, sed facilisis mauris enim in purus. Etiam tincidunt convallis velit, ut tempor magna aliquam a. Proin varius congue urna, a ullamcorper felis semper sit amet. Curabitur tincidunt urna sed iaculis rutrum. Sed sed elit tristique, suscipit felis non, vehicula urna. Nunc a ornare nisl. Nulla facilisi. Fusce quis ex dui. Vivamus vitae nisi sit amet lacus auctor venenatis et vel nisi. Fusce facilisis augue in felis tincidunt congue.</p></td><td colspan="1" rowspan="1" colwidth="32"><p><br>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus id feugiat nisl. Ut rutrum diam tellus, vitae consequat dolor rhoncus vel. Suspendisse ipsum purus, venenatis et pretium vitae, maximus eu metus. Integer dolor nunc, ultrices et elit quis, tristique tempus odio. Pellentesque varius maximus lobortis. Suspendisse potenti. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam efficitur eu est non semper.</p><p style="text-align: justify">Nunc egestas fermentum erat sed euismod. Pellentesque volutpat cursus ipsum, nec aliquet sapien aliquam consequat. Vivamus auctor turpis ut felis molestie, quis molestie dui tincidunt. Nunc fringilla, justo et scelerisque imperdiet, sem massa ultrices massa, sed facilisis mauris enim in purus. Etiam tincidunt convallis velit, ut tempor magna aliquam a. Proin varius congue urna, a ullamcorper felis semper sit amet. Curabitur tincidunt urna sed iaculis rutrum. Sed sed elit tristique, suscipit felis non, vehicula urna. Nunc a ornare nisl. Nulla facilisi. Fusce quis ex dui. Vivamus vitae nisi sit amet lacus auctor venenatis et vel nisi. Fusce facilisis augue in felis tincidunt congue.</p></td><td colspan="1" rowspan="1"><p><br>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus id feugiat nisl. Ut rutrum diam tellus, vitae consequat dolor rhoncus vel. Suspendisse ipsum purus, venenatis et pretium vitae, maximus eu metus. Integer dolor nunc, ultrices et elit quis, tristique tempus odio. Pellentesque varius maximus lobortis. Suspendisse potenti. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam efficitur eu est non semper.</p><p style="text-align: justify">Nunc egestas fermentum erat sed euismod. Pellentesque volutpat cursus ipsum, nec aliquet sapien aliquam consequat. Vivamus auctor turpis ut felis molestie, quis molestie dui tincidunt. Nunc fringilla, justo et scelerisque imperdiet, sem massa ultrices massa, sed facilisis mauris enim in purus. Etiam tincidunt convallis velit, ut tempor magna aliquam a. Proin varius congue urna, a ullamcorper felis semper sit amet. Curabitur tincidunt urna sed iaculis rutrum. Sed sed elit tristique, suscipit felis non, vehicula urna. Nunc a ornare nisl. Nulla facilisi. Fusce quis ex dui. Vivamus vitae nisi sit amet lacus auctor venenatis et vel nisi. Fusce facilisis augue in felis tincidunt congue.</p></td></tr></tbody></table><p>sadasdasdsd</p>',
    };
  },
  methods: {
    getValue(value) {
      console.log(
        "🚀 ------------------------------------------------------------🚀"
      );
      console.log(
        "🚀 ~ file: Playground.vue ~ line 18 ~ getValue ~ value",
        value
      );
      console.log(
        "🚀 ------------------------------------------------------------🚀"
      );

      //this.emitterValue = value;
    },
  },
};
</script>

<style lang="scss"></style>
