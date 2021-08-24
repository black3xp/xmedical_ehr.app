<script>
    import Header from "../../Layout/Header.svelte";
    import AsidePacientes from "../../Layout/AsidePacientes.svelte";
    import Select2 from '../../componentes/Select2.svelte';
    import { url } from "../../utils";
    import axios from "axios";
    import { onMount } from "svelte";
    import { push } from "svelte-spa-router";

    let aseguradora = '';
    let aseguradoras = [];
    let nacionalidad = '';
    let nacionalidades = [];
    let provincia = '';
    let provincias = [];
    let estadoCivil = '';
    let nombres = '';
    let primerApellido = '';
    let segundoApellido = '';
    let sexo = '';
    let fechaNacimiento = '';
    let telefono = '';
    let celular = '';
    let email = '';
    let cedula = '';
    let direccion = '';
    let ciudad = '';
    let numeroSeguro = '';

    const cargarAseguradoras = () => {
        const config = {
            method: 'get',
            url: `${url}/aseguradoras`
        };
        axios(config)
            .then(res => {
                aseguradoras = res.data;
            })
            .catch(err => {
                console.error(err)
            })
    }

    const cargarNacionalidades = () => {
        const config = {
            method: 'get',
            url: `${url}/nacionalidades`
        };
        axios(config)
            .then(res => {
                nacionalidades = res.data;
                console.log(res)
            })
            .catch(err => {
                console.error(err)
            })
    }

    const cargarProvincias = () => {
        const config = {
            method: 'get',
            url: `${url}/provincias`
        };
        axios(config)
            .then(res => {
                provincias = res.data;
                console.log(res)
            })
            .catch(err => {
                console.error(err)
            })
    }

    const guardarPaciente = () =>{
        const paciente = {
            nombres: nombres,
            primerApellido: primerApellido,
            segundoApellido: segundoApellido,
            sexo: sexo,
            fechaNacimiento: fechaNacimiento,
            estadoCivil: estadoCivil,
            telefono: telefono,
            celular: celular,
            email: email,
            cedula: cedula,
            direccion: direccion,
            ciudad: ciudad,
            numAsegurado: numeroSeguro,
            ProvinciaId: provincia,
            NacionalidadId: nacionalidad,
            AseguradoraId:aseguradora,
        }
        console.log(paciente)
        const config = {
            method: 'post',
            url: `${url}/pacientes`,
            data: paciente,
        };
        axios(config)
            .then(res => {
                console.log(res.data.id)
                if(res.data.id){
                    push(`/paciente/perfil/${res.data.id}`)
                }
            })
            .catch(err => {
                console.error(err)
            })
    }

    onMount(()=>{
        cargarAseguradoras()
        cargarNacionalidades()
        cargarProvincias()
    })
</script>

<AsidePacientes />

<main class="admin-main">
  <Header />
  <section class="admin-content">
    <div class="col-lg-8 m-b-30 m-auto" style="margin-top:50px !important;">
<div class="card m-b-30">
<div class="card-header">
    <h5 class="m-b-0">
        Nuevo Paciente
    </h5>

</div>
<div class="card-body" id="divDocumento">
    <div class="row">
        <div class="col-lg-12">

            <form id="frmDatosGenerales" on:submit|preventDefault={guardarPaciente}>
                <input type="hidden" name="idPaciente" value="">
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Cedula / Pasaporte</label>
                        <input type="text" bind:value={cedula} class="form-control" name="Cedula" id="txtCedula" pattern="^[0-9]+$" maxlength="11">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group col-md-12">
                        <label for="">Nombre(s)</label>
                        <input type="name" bind:value={nombres} class="form-control" name="Nombres" max="100" required="">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Primer Apellido</label>
                        <input type="last-name" bind:value={primerApellido} class="form-control" name="PrimerApellido" max="100" required="">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Segundo Apellido</label>
                        <input type="last-name" bind:value={segundoApellido} class="form-control" name="SegundoApellido" id="txtApellido" max="100">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Sexo</label>
                        <select class="form-control" bind:value={sexo} name="Sexo" id="slSexo" required="">
                            <option value="">- Seleccionar -</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                        </select>

                    </div>
                    <div class="col-md-6 form-group">
                        <label for="txtFechaNacimiento">Fecha de nacimiento</label>
                        <input
                            bind:value={fechaNacimiento}
                            type="date"
                            name="FechaNacimiento"
                            class="form-control"
                            id="txtFechaNacimiento"
                            autocomplete="off"
                            required=""
                        />

                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Telefono</label>
                        <input type="text" class="form-control" bind:value={telefono} name="Telefono" id="txtTelefono" max="15">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Celular</label>
                        <input type="text" bind:value={celular} class="form-control" name="Celular" id="txtCelular" max="15">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Email</label>
                        <input type="email" bind:value={email} class="form-control" placeholder="prueba@correo.com" name="Correo" id="txtCorreo">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Estado Civil</label>
                        <select class="form-control" name="EstadoCivil" id="slEstadoCivil" required="" bind:value={estadoCivil}>
                            <option value=""> - Seleccionar -</option>
                            <option value="S">Soltero</option>
                            <option value="C">Casado</option>
                            <option value="D">Divorciado</option>
                            <option value="U">Union Libre</option>
                        </select>
                    </div>
                </div>
                <br>
                <h5 style="margin-bottom: 0;">Datos de Aseguradora</h5><br>
                <hr style="margin-top: 0;">
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <Select2
                            id={'sltAseguradoras'}
                            datos={aseguradoras}
                            bind:valor={aseguradora}
                            placeholder={' - seleccionar aseguradora - '}
                            label={'Aseguradora'}
                        />
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">No. Afiliado</label>
                        <input type="text" bind:value={numeroSeguro} name="Poliza" pattern="^[0-9]+$" class="form-control">
                    </div>
                </div>
                <br>

                <h5 style="margin-bottom: 0;">Datos demográficos</h5><br>
                <hr style="margin-top: 0;">

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <Select2
                            id={'sltNacionalidad'}
                            datos={nacionalidades}
                            bind:valor={nacionalidad}
                            placeholder={' - seleccionar nacionalidad - '}
                            label={'Nacionalidad'}
                        />
                    </div>
                    <div class="form-group col-md-6">
                        <Select2
                            id={'sltProvincias'}
                            datos={provincias}
                            bind:valor={provincia}
                            placeholder={' - seleccionar provincia - '}
                            label={'Estado / provincia'}
                        />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-12">
                        <label for="inputAddress">Dirección</label>
                        <input type="text" bind:value={direccion} class="form-control" id="inputAddress" placeholder="1234 Main St" name="Direccion" data-bind="value: direccion" max="100">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Ciudad</label>
                        <input type="text" bind:value={ciudad} class="form-control" placeholder="Nombre de la Ciudad" name="Ciudad">
                    </div>
                </div>


                <div class="card-body d-flex justify-content-end align-items-center">
                    <button type="reset" class="btn btn-danger mr-2" data-bind="click: $root.limpiarFormulario">Limpiar</button>
                    <button type="submit" class="btn btn-success"><i class="mdi mdi-content-save-outline"></i>
                        Guardar paciente
                    </button>
                </div>
            </form>

        </div>
    </div>

</div>
<!--.card-body-->
</div>

</div>


</section>
</main>